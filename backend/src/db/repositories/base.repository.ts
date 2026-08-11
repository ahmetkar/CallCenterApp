import {
  DeepPartial,
  FindManyOptions,
  FindOneOptions,
  ObjectLiteral,
  Repository,
} from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { AppDataSource } from '../data-source';

export class BaseRepository<
  T extends ObjectLiteral
> {
  protected repository: Repository<T>;

  constructor(entity: {
    new (): T;
  }) {
    this.repository =
      AppDataSource.getRepository(entity);
  }

  async findAll(
    options?: FindManyOptions<T>
  ) {
    return this.repository.find(options);
  }

  async findById(
    id: number,
    options?: FindOneOptions<T>
  ) {
    return this.repository.findOne({
      where: { id } as any,
      ...(options || {}),
    });
  }

  async findOne(
    options: FindOneOptions<T>
  ) {
    return this.repository.findOne(options);
  }

  async create(
    data: DeepPartial<T>
  ) {
    const entity =
      this.repository.create(data);

    return this.repository.save(entity);
  }

  async update(
    id: number,
    data: QueryDeepPartialEntity<T>
  ) {
    await this.repository.update(
      id as any,
      data
    );

    return this.findById(id);
  }

  async delete(id: number) {
    await this.repository.delete(
      id as any
    );

    return true;
  }

  async count(
    options?: FindManyOptions<T>
  ) {
    return this.repository.count(options);
  }

  async exists(id: number) {
    const count =
      await this.repository.count({
        where: { id } as any,
      });

    return count > 0;
  }

  protected get repo() {
    return this.repository;
  }
}